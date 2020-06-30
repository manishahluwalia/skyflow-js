import {
  ELEMENT_EVENTS_TO_CLIENT,
  ELEMENTS,
  ELEMENT_EVENTS_TO_IFRAME,
  STYLE_TYPE,
} from "../../constants";
import iframer, {
  setAttributes,
  getIframeSrc,
} from "../../../iframe-libs/iframer";
import EventEmitter from "../../../event-emitter";
import Bus from "../../../libs/Bus";
import deepClone from "../../../libs/deepClone";
import {
  getStylesFromClass,
  buildStylesFromClassesAndStyles,
} from "../../../libs/styles";
import { validateElementOptions } from "../../../libs/element-options";

class Element {
  elementType: string;
  private name: string;
  private metaData: any;
  private options: any;
  private iframe: HTMLIFrameElement;
  private state = {
    isEmpty: true,
    isComplete: false,
    isValid: false,
    isFocused: false,
    container: <HTMLFrameElement | null>null,
    value: undefined,
  };

  // label focus

  private eventEmitter: EventEmitter = new EventEmitter();
  private bus = new Bus();

  constructor(elementType: string, options: any, metaData: any) {
    if (!ELEMENTS.hasOwnProperty(elementType)) {
      throw new Error("Provide valid element type");
      return;
    }
    this.metaData = metaData;
    this.options = { ...options };
    this.name = options.name;
    this.elementType = elementType;

    this.iframe = iframer({ name: this.name });

    this.registerIFrameBusListener();

    this.eventEmitter.on(
      ELEMENT_EVENTS_TO_CLIENT.CHANGE,
      (data) => {
        this.state.isEmpty = data.isEmpty;
        this.state.isComplete = data.isComplete;
        this.state.isValid = data.isValid;
        this.state.isFocused = data.isFocused;
        if (!this.options.sensitive) this.state.value = data.value;
      },
      true
    );
  }

  mount = (domElement) => {
    this.unmount();
    try {
      if (typeof domElement === "string")
        this.state.container = document.querySelector(domElement);
      else this.state.container = domElement;
    } catch (e) {
      throw new Error("Provided element selector is not valid or not found");
    }

    setAttributes(this.iframe, { src: getIframeSrc(this.metaData.uuid) });
    this.state.container?.appendChild(this.iframe);
    // todo: add event listener on change/focus/blur on label and emit change event on iframe

    const sub = (data, callback) => {
      if (data.name === this.name) {
        callback(this.options);
        this.bus.off(ELEMENT_EVENTS_TO_IFRAME.FRAME_READY, sub);
      }
    };
    this.bus.on(ELEMENT_EVENTS_TO_IFRAME.FRAME_READY, sub);
  };

  update = (options) => {
    options = deepClone(options);

    options = { ...this.options, ...options };

    validateElementOptions(this.elementType, this.options, options);

    if (
      this.options.styles === options.styles ||
      this.options.classes === options.classes
    ) {
      delete options.styles; // updating styles don't required if there is no change
    } else {
      buildStylesFromClassesAndStyles(options.classes, options.styles);
    }

    this.bus.emit(ELEMENT_EVENTS_TO_IFRAME.SET_VALUE, {
      name: this.name,
      options: options,
    });
  };

  getState = () => {
    return {
      isEmpty: this.state.isEmpty,
      isComplete: this.state.isComplete,
      isValid: this.state.isValid,
      isFocused: this.state.isFocused,
      ...(!this.options.sensitive && { value: this.state.value }),
    };
  };

  getOptions = () => {
    const options = deepClone(this.options);
    delete options.options;
    delete options.value;

    return options;
  };

  // listening to element events and error messages on iframe
  // todo: off methods
  on(eventName: string, handler) {
    if (Object.values(ELEMENT_EVENTS_TO_CLIENT).includes(eventName)) {
      this.eventEmitter.on(eventName, (data) => {
        handler(data);
      });
    } else {
      throw new Error("Provide valid event listener");
    }
  }

  // methods to invoke element events
  blur = () => {
    this.bus.emit(ELEMENT_EVENTS_TO_IFRAME.INPUT_EVENT, {
      name: this.name,
      event: ELEMENT_EVENTS_TO_CLIENT.BLUR,
    });
  };

  focus = () => {
    this.bus.emit(ELEMENT_EVENTS_TO_IFRAME.INPUT_EVENT, {
      name: this.name,
      event: ELEMENT_EVENTS_TO_CLIENT.FOCUS,
    });
  };

  destroy = () => {
    this.bus.emit(
      ELEMENT_EVENTS_TO_IFRAME.DESTROY_FRAME,
      {
        name: this.name,
      },
      () => {
        this.unmount();
        this.bus.teardown();
        this.eventEmitter.resetEvents();
        this.eventEmitter._emit(ELEMENT_EVENTS_TO_IFRAME.DESTROY_FRAME);
        delete this.iframe;
      }
    );
  };

  onDestroy = (callback) => {
    this.eventEmitter.on(
      ELEMENT_EVENTS_TO_IFRAME.DESTROY_FRAME,
      () => {
        callback(this.elementType);
      },
      true
    );
  };

  unmount = () => {
    this.iframe.remove();
  };

  resetEvents = () => {
    this.eventEmitter.resetEvents();
  };

  private registerIFrameBusListener() {
    this.bus.on(ELEMENT_EVENTS_TO_IFRAME.INPUT_EVENT, (data: any) => {
      if (data.name === this.name) {
        switch (data.event) {
          case ELEMENT_EVENTS_TO_CLIENT.FOCUS:
            this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.FOCUS);
            break;
          case ELEMENT_EVENTS_TO_CLIENT.BLUR:
            this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.BLUR);
            break;
          case ELEMENT_EVENTS_TO_CLIENT.CHANGE:
            this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.CHANGE, {
              ...data.value,
              elementType: this.elementType,
            });
            break;
          case ELEMENT_EVENTS_TO_CLIENT.READY:
            this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.READY);
            break;
          // todo: need to implement the below events
          // case ELEMENT_EVENTS_TO_CLIENT.ESCAPE:
          //   this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.ESCAPE);
          //   break;
          // case ELEMENT_EVENTS_TO_CLIENT.CLICK:
          //   this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.CLICK);
          //   break;
          // case ELEMENT_EVENTS_TO_CLIENT.ERROR:
          //   this.eventEmitter._emit(ELEMENT_EVENTS_TO_CLIENT.ERROR);
          //   break;

          default:
            throw new Error("Provide a valid event type");
        }
      }
    });
  }
}

export default Element;
