declare namespace ICommon {
  interface ISetBackgroundWindowParam {
    windowName: string;
  }
  interface IResumeBackgroundWindowParam {
    windowName: string;
    windowMeta: IWallpaperAddOnParam.IWindowMeta;
  }
}
