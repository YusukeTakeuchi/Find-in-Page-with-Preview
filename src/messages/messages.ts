import { Messaging } from '../util/messaging';
import { Rect, Size2d, ScreenshotResultMaybeError } from '../types';

type IMessages = {
  Ping(): Promise<{ result: boolean }>,

  Start(): void,

  Screenshot(arg: {
    clusterRect: Rect | null,
    ranges: browser.find.RangeData[],
    ssSize: Size2d,
  }): Promise<ScreenshotResultMaybeError>,

  CamouflageInputs(q: string): void,

  UncamouflageInputs(): void,

  GotoID(arg: {
    id: number,
    smoothScroll: boolean
  }): Promise<void>,

  Reset(): Promise<{ success: boolean}>,
}

type IMessagesBG = {
  SetContextMenu(arg : { popup: boolean, sidebar: boolean }): void,
}

type IMessagesFindWindow = {
  NotifyMutation(isonload: boolean, { sender } : { sender: browser.runtime.MessageSender }): void,
}

const Messages = new Messaging<IMessages>(),
      MessagesBG = new Messaging<IMessagesBG>(),
      MessagesFindWindow = new Messaging<IMessagesFindWindow>();

export {
  Messages,
  MessagesBG,
  MessagesFindWindow,
}