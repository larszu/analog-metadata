import { useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../data/db";
import { updateRoll } from "../../data/repo";
import {
  concatChunks,
  decodeSignal,
  encodeSignal,
  makeMeta,
  sliceIntoChunks,
  type TransferMeta,
} from "../../core/pairing";
import { fileToDataUrl, makeThumbnail } from "../imageUtils";
import { Field, useToast } from "../components";
import { useT } from "../../app/prefs";

type Role = "choose" | "receive" | "send";
const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function waitForIce(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const done = () => {
      if (pc.iceGatheringState === "complete") {
        pc.removeEventListener("icegatheringstatechange", done);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", done);
    setTimeout(resolve, 2500); // fall back to whatever we've gathered
  });
}

export function Pair() {
  const toast = useToast();
  const t = useT();
  const [role, setRole] = useState<Role>("choose");
  const [status, setStatus] = useState("");
  const [connected, setConnected] = useState(false);
  const [localCode, setLocalCode] = useState("");
  const [localQr, setLocalQr] = useState("");
  const [remoteCode, setRemoteCode] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [received, setReceived] = useState<{ url: string; name: string; dataUrl: string } | null>(null);
  const [saveRollId, setSaveRollId] = useState("");
  const [scanning, setScanning] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const incomingRef = useRef<{ meta: TransferMeta; chunks: Uint8Array[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scanVideo = useRef<HTMLVideoElement>(null);
  const scanStream = useRef<MediaStream | null>(null);

  const rolls = useLiveQuery(() => db.rolls.orderBy("updatedAt").reverse().toArray(), []);

  const showLocal = async (kind: "offer" | "answer", sdp: string) => {
    const code = encodeSignal(kind, sdp);
    setLocalCode(code);
    try {
      setLocalQr(await QRCode.toDataURL(code, { margin: 1, width: 320 }));
    } catch {
      setLocalQr(""); // SDP too big for a QR — the copyable text still works
    }
  };

  const wireChannel = (channel: RTCDataChannel) => {
    channel.binaryType = "arraybuffer";
    channelRef.current = channel;
    channel.onopen = () => { setConnected(true); setStatus("Connected"); };
    channel.onclose = () => setConnected(false);
    channel.onmessage = (e) => {
      if (typeof e.data === "string") {
        const msg = JSON.parse(e.data);
        if (msg.type === "meta") { incomingRef.current = { meta: msg, chunks: [] }; setProgress(0); }
        else if (msg.type === "done" && incomingRef.current) {
          const { meta, chunks } = incomingRef.current;
          const bytes = concatChunks(chunks);
          const blob = new Blob([bytes as unknown as BlobPart], { type: meta.mime });
          const url = URL.createObjectURL(blob);
          fileToDataUrl(blob).then((dataUrl) => setReceived({ url, name: meta.name, dataUrl }));
          setProgress(1);
          setStatus(`Received ${meta.name}`);
        }
      } else if (incomingRef.current) {
        incomingRef.current.chunks.push(new Uint8Array(e.data as ArrayBuffer));
        setProgress(incomingRef.current.chunks.length / incomingRef.current.meta.chunks);
      }
    };
  };

  // ---- Receiver (usually the desktop): make an offer ----
  const startReceive = async () => {
    setRole("receive");
    setStatus("Generating pairing code…");
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    wireChannel(pc.createDataChannel("file"));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    await showLocal("offer", JSON.stringify(pc.localDescription));
    setStatus("Show this code to your phone, then paste its reply below.");
  };

  const receiverAcceptAnswer = async () => {
    try {
      const sig = decodeSignal(remoteCode.trim());
      if (sig.kind !== "answer") throw new Error("That's not a reply code.");
      await pcRef.current?.setRemoteDescription(JSON.parse(sig.sdp));
      setStatus("Linking…");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bad code");
    }
  };

  // ---- Sender (usually the phone): consume the offer, make an answer ----
  const senderAcceptOffer = async () => {
    try {
      const sig = decodeSignal(remoteCode.trim());
      if (sig.kind !== "offer") throw new Error("That's not a pairing code.");
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      pc.ondatachannel = (e) => wireChannel(e.channel);
      await pc.setRemoteDescription(JSON.parse(sig.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      await showLocal("answer", JSON.stringify(pc.localDescription));
      setStatus("Show this reply code back to the desktop.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Bad code");
    }
  };

  const sendPhoto = async (file: File | undefined) => {
    const channel = channelRef.current;
    if (!file || !channel || channel.readyState !== "open") return toast("Not connected yet");
    const bytes = new Uint8Array(await file.arrayBuffer());
    channel.send(JSON.stringify(makeMeta(file.name, file.type || "image/jpeg", bytes)));
    const chunks = sliceIntoChunks(bytes);
    for (let i = 0; i < chunks.length; i++) {
      while (channel.bufferedAmount > 4 * 1024 * 1024) await new Promise((r) => setTimeout(r, 20));
      channel.send(chunks[i] as unknown as ArrayBuffer);
      setProgress((i + 1) / chunks.length);
    }
    channel.send(JSON.stringify({ type: "done" }));
    setStatus("Sent ✓");
    toast("Photo sent");
  };

  // ---- QR camera scanning (fills the remote-code box) ----
  const startScan = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      scanStream.current = stream;
      setScanning(true);
      const video = scanVideo.current!;
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      const tick = () => {
        if (!scanStream.current) return;
        if (video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(video, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = jsQR(img.data, img.width, img.height);
          if (found?.data) { setRemoteCode(found.data); stopScan(); toast("Code scanned"); return; }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      toast("Couldn't open the camera — paste the code instead");
    }
  };
  const stopScan = () => {
    scanStream.current?.getTracks().forEach((t) => t.stop());
    scanStream.current = null;
    setScanning(false);
  };

  const attachToRoll = async () => {
    if (!received || !saveRollId) return;
    const roll = await db.rolls.get(saveRollId);
    if (!roll) return;
    const readable = await makeThumbnail(received.dataUrl, 1400);
    await updateRoll(roll.id, {
      logPhotos: [...(roll.logPhotos ?? []), { id: crypto.randomUUID(), dataUrl: readable, createdAt: new Date().toISOString() }],
    });
    toast(`Saved to “${roll.label}” as a log page`);
  };

  const reset = () => {
    pcRef.current?.close();
    pcRef.current = null;
    channelRef.current = null;
    stopScan();
    setRole("choose"); setStatus(""); setConnected(false);
    setLocalCode(""); setLocalQr(""); setRemoteCode(""); setProgress(null); setReceived(null);
  };

  return (
    <div>
      <div className="content-head">
        <div>
          <h1>{t("Pair devices")} <span className="badge warn">beta</span></h1>
          <p className="sub">
            {t("Send a photo of your log page straight from your phone to this device over your local network — no cable, no cloud. Both devices open this page; one receives, the other sends.")}
          </p>
        </div>
        {role !== "choose" && <button className="btn ghost" onClick={reset}>{t("Start over")}</button>}
      </div>

      {role === "choose" && (
        <div className="grid cols-2" style={{ maxWidth: 720 }}>
          <div className="card click" onClick={startReceive}>
            <h3>{t("🖥️ Receive here")}</h3>
            <div className="meta">{t("This device shows a pairing code and receives the photo. Usually your desktop.")}</div>
          </div>
          <div className="card click" onClick={() => setRole("send")}>
            <h3>{t("📱 Send from here")}</h3>
            <div className="meta">{t("Scan the other device's code, then pick or snap the log page. Usually your phone.")}</div>
          </div>
        </div>
      )}

      {role !== "choose" && (
        <div className="grid cols-2" style={{ alignItems: "start" }}>
          <div className="card">
            <h3>{role === "receive" ? "1 · Your pairing code" : "1 · Scan / paste the pairing code"}</h3>
            {status && <p className="hint" style={{ marginTop: 0 }}>{status}</p>}

            {role === "receive" && localCode && (
              <>
                {localQr && <img src={localQr} alt="pairing QR" style={{ width: 220, borderRadius: 8, background: "#fff", padding: 6 }} />}
                <Field label="…or copy this code to the phone">
                  <textarea readOnly value={localCode} rows={3} onFocus={(e) => e.currentTarget.select()} />
                </Field>
              </>
            )}

            {role === "send" && !localCode && (
              <>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <button className="btn" onClick={startScan}>📷 Scan QR</button>
                </div>
                <Field label="Pairing code from the desktop">
                  <textarea value={remoteCode} onChange={(e) => setRemoteCode(e.target.value)} rows={3} placeholder="Paste the code shown on the other device" />
                </Field>
                <button className="btn primary" onClick={senderAcceptOffer} disabled={!remoteCode.trim()}>Continue</button>
              </>
            )}

            {role === "send" && localCode && (
              <>
                {localQr && <img src={localQr} alt="reply QR" style={{ width: 220, borderRadius: 8, background: "#fff", padding: 6 }} />}
                <Field label="…or copy this reply back to the desktop">
                  <textarea readOnly value={localCode} rows={3} onFocus={(e) => e.currentTarget.select()} />
                </Field>
              </>
            )}
          </div>

          <div className="card">
            <h3>2 · {role === "receive" ? "Paste the phone's reply" : "Send the photo"}</h3>

            {role === "receive" && !connected && (
              <>
                <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                  <button className="btn" onClick={startScan}>📷 Scan reply</button>
                </div>
                <Field label="Reply code from the phone">
                  <textarea value={remoteCode} onChange={(e) => setRemoteCode(e.target.value)} rows={3} placeholder="Paste the reply code" />
                </Field>
                <button className="btn primary" onClick={receiverAcceptAnswer} disabled={!remoteCode.trim()}>Link devices</button>
              </>
            )}

            {connected && (
              <p><span className="badge ok">● connected</span></p>
            )}

            {role === "send" && (
              <>
                <p className="hint" style={{ marginTop: 0 }}>{connected ? "Linked — send your log page." : "Waiting for the desktop to link…"}</p>
                <button className="btn" onClick={() => fileInput.current?.click()} disabled={!connected}>📷 Choose / snap log page</button>
                <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden
                  onChange={(e) => { sendPhoto(e.target.files?.[0]); e.target.value = ""; }} />
              </>
            )}

            {progress !== null && (
              <div style={{ height: 6, background: "var(--bg-elev-2)", borderRadius: 4, marginTop: 12 }}>
                <div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
              </div>
            )}

            {received && (
              <div style={{ marginTop: 14 }}>
                <img src={received.url} alt="received log page" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <a className="btn sm" href={received.url} download={received.name}>⤓ Download</a>
                  <select value={saveRollId} onChange={(e) => setSaveRollId(e.target.value)} style={{ width: "auto" }}>
                    <option value="">Attach to roll…</option>
                    {rolls?.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <button className="btn sm primary" onClick={attachToRoll} disabled={!saveRollId}>Attach</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {scanning && (
        <div className="modal-backdrop" onClick={stopScan}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Point at the QR code</h3>
            <video ref={scanVideo} playsInline muted style={{ width: "100%", borderRadius: 8 }} />
            <div className="modal-actions"><button className="btn ghost" onClick={stopScan}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
