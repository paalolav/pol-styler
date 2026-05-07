import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName
} from '@microsoft/sp-application-base';
import { SPComponentLoader } from '@microsoft/sp-loader';

import * as strings from 'PolStylerApplicationCustomizerStrings';

const LOG_SOURCE: string = 'PolStylerApplicationCustomizer';

export interface IPolStylerApplicationCustomizerProperties {  
  cssFilePath: string;
}

export default class PolStylerApplicationCustomizer
  extends BaseApplicationCustomizer<IPolStylerApplicationCustomizerProperties> {

  private _topPlaceholder: PlaceholderContent | undefined;

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);
    
    if (this.properties.cssFilePath) {
      let cssFileToLoad = this.properties.cssFilePath.trim();
      if (!cssFileToLoad.startsWith('https://')) {
        const baseUrl = `${document.location.protocol}//${document.location.hostname}`;
        cssFileToLoad = cssFileToLoad.startsWith('/')
          ? `${baseUrl}${cssFileToLoad}`
          : `${baseUrl}/${cssFileToLoad}`;
      }
      SPComponentLoader.loadCss(cssFileToLoad);
    }

    this.context.placeholderProvider.changedEvent.add(this, this._renderPlaceholders);

    return Promise.resolve();
  }

  private _renderPlaceholders(): void {
    if (!this._topPlaceholder) {
      this._topPlaceholder = this.context.placeholderProvider.tryCreateContent(
        PlaceholderName.Top,
        { onDispose: this._onDispose }
      );
    }
  }

  private _onDispose(): void {
    Log.info(LOG_SOURCE, 'Disposed top placeholder.');
  }
}
