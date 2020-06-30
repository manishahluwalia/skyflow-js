import Element from "./element";
import {
  ELEMENTS,
  FRAME_CONTROLLER,
  ELEMENT_EVENTS_TO_IFRAME,
  CONTROLLER_STYLES,
} from "../constants";
import iframer, {
  setAttributes,
  getIframeSrc,
  setStyles,
} from "../../iframe-libs/iframer";
import bus from "framebus";
import uuid from "../../libs/uuid";
import deepClone from "../../libs/deepClone";
import {
  getStylesFromClass,
  buildStylesFromClassesAndStyles,
} from "../../libs/styles";
import { validateElementOptions } from "../../libs/element-options";

class Elements {
  elements: Record<string, Element> = {};
  count: number = 0;
  metaData: any;
  // bus class to store all listeners and teardown on destroy
  // destructor to remove events(non bus events - with the event emitter) on destroy
  constructor(
    {
      fonts = {} /* todo: font object */,
      locale = "en" /* need to be auto from browser */,
    } = {},
    metaData
  ) {
    if (!metaData.uuid) {
      throw new Error("SSN not provided");
      return;
    }
    this.metaData = metaData;
    const iframe = iframer({ name: FRAME_CONTROLLER });
    setAttributes(iframe, {
      src: getIframeSrc(this.metaData.uuid),
    });
    setStyles(iframe, { ...CONTROLLER_STYLES });

    const sub = (data, callback) => {
      if (data.name === FRAME_CONTROLLER) {
        callback({ ...metaData });
        bus.off(ELEMENT_EVENTS_TO_IFRAME.FRAME_READY, sub);
      }
    };
    bus.on(ELEMENT_EVENTS_TO_IFRAME.FRAME_READY, sub);

    document.body.append(iframe);
  }

  // create("ssn", {
  // classes: {
  //   base: "", // default
  //   complete: "",
  //   empty: "",
  //   focus: "",
  //   invalid: "",
  //   webkitAutoFill: ""
  // },
  // style: {
  //   base: {}, // default
  //   complete: {},
  //   empty: {},
  //   invalid: {}
  // },
  // value: "",
  // name: vault field name,
  // options:[{value: string, text: string}] //for dropdown

  // sensitive: true/false can't be updated
  // validation: [required, default, //regex]
  // serializers/formatters --> ?

  // disabled: false,
  // hidden: true/false, --> ?
  // readeOnly: true/false,
  // placeholder: string,
  // min, max, maxLength, minLength
  // replacePattern = "" or pattern
  // mask: ["","",""]
  // })
  create = (elementType: string, options: any = {}) => {
    options = deepClone(options);
    if (this.elements[options.name]) {
      // todo: update if already exits?
      throw new Error("This element already existed: " + options.name);
      return this.elements[options.name];
    }
    options.sensitive = options.sensitive || ELEMENTS[elementType].sensitive;
    options.replacePattern =
      options.replacePattern || ELEMENTS[elementType].replacePattern;
    options.mask = options.mask || ELEMENTS[elementType].mask;
    validateElementOptions(elementType, options);

    const classes = options.classes || {};
    const styles = options.styles || {};

    buildStylesFromClassesAndStyles(classes, styles);

    options.classes = classes;
    options.styles = styles;

    // todo: if name contains : need to fix the same in below
    // todo: what if elementType is different but name is same
    options.name = `${elementType}:${options.name}`;

    if (
      elementType === ELEMENTS.radio.name ||
      elementType === ELEMENTS.checkbox.name
    ) {
      options.name = `${options.name}:${options.value}`;
    }

    const element = new Element(elementType, options, this.metaData);
    this.elements[options.name] = element;

    element.onDestroy((elementName) => {
      this.removeElement(elementName);
    });

    return element;
  };

  // { // display flex by default(not changeable)
  //   justifyContent: "", //default flex-start
  //   alignItems: "", //default stretch
  //   rows: [
  //     { // row 1, display flex by default(not changeable)
  //       justifyContent: "", //default flex-start
  //       alignItems: "",  //default stretch
  //       spacing: "",// default 0px
  //       elements: [{element1}, {element2}]
  //     },
  //     { /* row2 */ }
  //   ]
  // }
  // the spacing can be adjusted using the flex styling and the element padding(from element styles)
  createBulk = (multipleElements: any) => {

  }

  // todo: need to send single element
  getElement = (
    elementType: string,
    elementName: string = elementType,
    valueForRadioOrCheckbox?: string
  ) => {
    for (const element in this.elements) {
      const elementData = element.split(":");
      if (
        elementData[0] === elementType &&
        elementData[1] === elementName &&
        (elementData[2] !== undefined
          ? elementData[2] === valueForRadioOrCheckbox
          : true)
      )
        return this.elements[element];
    }

    return null;
  };

  // todo: get all elements metadata like name, type and its instance ?
  getElements = () => {
    const elements: any[] = [];
    for (const element in this.elements) {
      const elementData = element.split(":");
      elements.push({
        name: elementData[1],
        type: elementData[0],
        instance: this.elements[element],
      });
    }

    return elements;
  };

  private removeElement = (elementName: string) => {
    for (let element in this.elements) {
      if (element === elementName) delete this.elements[element];
    }
  };

  tokenize = () => {
    return new Promise((resolve, reject) => {
      bus
        // .target(getIframeSrc(this.metaData.uuid))
        .emit(ELEMENT_EVENTS_TO_IFRAME.TOKENIZATION_REQUEST, {}, function (
          data: any
        ) {
          if (data.error) {
            reject(data);
          } else {
            resolve(data);
          }
        });
    });
  };
}

export default Elements;
