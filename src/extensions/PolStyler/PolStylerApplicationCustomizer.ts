import { Log } from '@microsoft/sp-core-library';
import {
  BaseApplicationCustomizer,
  PlaceholderContent,
  PlaceholderName
} from '@microsoft/sp-application-base';
import { SPComponentLoader } from '@microsoft/sp-loader';

import * as strings from 'PolStylerApplicationCustomizerStrings';
import { resolveCssUrl } from './cssSource';

const LOG_SOURCE: string = 'PolStylerApplicationCustomizer';

export interface IPolStylerApplicationCustomizerProperties {  
  cssFilePath: string;
  allowedCssHosts?: string;
}

export default class PolStylerApplicationCustomizer
  extends BaseApplicationCustomizer<IPolStylerApplicationCustomizerProperties> {

  private _topPlaceholder: PlaceholderContent | undefined;

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, `Initialized ${strings.Title}`);
    
    if (this.properties.cssFilePath) {
      try {
        const cssFileToLoad = resolveCssUrl(
          this.properties.cssFilePath,
          document.location.origin,
          this.properties.allowedCssHosts
        );
        SPComponentLoader.loadCss(cssFileToLoad);
      } catch (error) {
        Log.error(LOG_SOURCE, error as Error);
      }
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
