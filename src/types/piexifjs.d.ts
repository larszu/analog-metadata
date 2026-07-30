declare module "piexifjs" {
  type ExifDict = Record<string, Record<number, unknown>>;
  const piexif: {
    ImageIFD: Record<string, number>;
    ExifIFD: Record<string, number>;
    GPSIFD: Record<string, number>;
    dump(exifObj: ExifDict): string;
    insert(exifBytes: string, jpegDataUrl: string): string;
    load(jpegDataUrl: string): ExifDict;
    GPSHelper: {
      degToDmsRational(deg: number): [number, number][];
    };
  };
  export default piexif;
}
