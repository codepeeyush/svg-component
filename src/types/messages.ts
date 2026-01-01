/**
 * Message types for communication between content script, popup, and background
 */

export interface SVGInfo {
  index: number;
  tagName: string;
  width: string | null;
  height: string | null;
  viewBox: string | null;
  hasInlineStyles: boolean;
  isExternal: boolean;
  src?: string;
}

export interface Message {
  type: string;
  data?: any;
}

export interface GetSVGsMessage extends Message {
  type: 'GET_SVGS';
}

export interface GetSVGsResponse extends Message {
  type: 'SVGS_FOUND';
  data: {
    svgs: SVGInfo[];
    count: number;
  };
}

export interface ConvertSVGMessage extends Message {
  type: 'CONVERT_SVG';
  data: {
    index: number;
    format: 'tsx' | 'jsx';
    componentName: string;
    optimize: boolean;
    addProps: {
      width?: boolean;
      height?: boolean;
      className?: boolean;
      color?: boolean;
    };
  };
}

export interface ConvertSVGResponse extends Message {
  type: 'SVG_CONVERTED';
  data: {
    code: string;
    originalSVG: string;
  };
}

export interface ToggleOverlayMessage extends Message {
  type: 'TOGGLE_OVERLAY';
  data: {
    enabled: boolean;
  };
}

export interface HighlightSVGMessage extends Message {
  type: 'HIGHLIGHT_SVG';
  data: {
    index: number;
  };
}

export interface ErrorMessage extends Message {
  type: 'ERROR';
  data: {
    message: string;
  };
}

export interface SVGSelectedMessage extends Message {
  type: 'SVG_SELECTED';
  data: {
    index: number;
  };
}

export interface UpdateBadgeMessage extends Message {
  type: 'UPDATE_BADGE';
  data: {
    count: number;
  };
}

export interface SuccessMessage extends Message {
  type: 'SUCCESS';
}

export type ExtensionMessage =
  | GetSVGsMessage
  | GetSVGsResponse
  | ConvertSVGMessage
  | ConvertSVGResponse
  | ToggleOverlayMessage
  | HighlightSVGMessage
  | ErrorMessage
  | SVGSelectedMessage
  | UpdateBadgeMessage
  | SuccessMessage;
