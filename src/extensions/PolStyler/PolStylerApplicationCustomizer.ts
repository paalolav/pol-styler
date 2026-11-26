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
    
    const configuredPath: unknown = this.properties.cssFilePath;
    if (configuredPath !== undefined && configuredPath !== null && configuredPath !== '') {
      const cssUrl = this._resolveCssUrl(configuredPath);
      if (cssUrl) {
        SPComponentLoader.loadCss(cssUrl);
      } else {
        Log.warn(LOG_SOURCE, 'Stylesheet configuration rejected: use a same-origin HTTPS URL or tenant-relative path.');
      }
    }

    this.context.placeholderProvider.changedEvent.add(this, this._renderPlaceholders);

    return Promise.resolve();
  }

  private _resolveCssUrl(value: unknown): string | undefined {
    // Reject controls before the URL parser silently normalizes them away.
    // eslint-disable-next-line no-control-regex
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f\\]/.test(value)) {
      return undefined;
    }

    const path = value.trim();
    if (!path || path.startsWith('//')) {
      return undefined;
    }

    try {
      // Resolve relative paths at the tenant root, preserving the original configuration contract.
      const url = new URL(path, `${document.location.origin}/`);
      if (url.protocol !== 'https:' || url.origin !== document.location.origin || url.username || url.password) {
        return undefined;
      }
      return url.href;
    } catch {
      return undefined;
    }
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
