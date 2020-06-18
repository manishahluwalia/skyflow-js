import Client from "../../../client";
import bus from "framebus";
import {
  ELEMENT_EVENTS_TO_CLIENT,
  ELEMENT_EVENTS_TO_IFRAME,
  ELEMENTS,
  FRAME_CONTROLLER,
} from "../../constants";
import EventEmitter from "../../../event-emitter";
import { mask, unMask } from "../../../libs/strings";
import { regExFromString } from "../../../libs/regex";

// create separate IFrameFormElement for each radio button and separate or SET_VALUE event b/w radio buttons.
// while hitting tokenize it checks whether there are more than 2 ':' if so append each values in an array(for checkbox)
export class IFrameForm {
  // single form to all form elements
  private iFrameFormElements: Record<string, IFrameFormElement> = {};
  private client?: Client;
  private clientMetaData?: string;
  private callbacks: Function[] = [];
  constructor() {
    bus
      .target(location.origin)
      .on(ELEMENT_EVENTS_TO_IFRAME.FRAME_READY, (data, callback) => {
        if (!data.name) {
          throw new Error("Required params are not provided");
        }
        if (data.name === FRAME_CONTROLLER) {
          return;
        }
        const frameGlobalName: string = <string>data.name;
        if (this.clientMetaData)
          IFrameForm.initializeFrame(
            window.parent,
            frameGlobalName,
            this.iFrameFormElements,
            this.clientMetaData
          );
        else
          this.callbacks.push(() => {
            IFrameForm.initializeFrame(
              window.parent,
              frameGlobalName,
              this.iFrameFormElements,
              this.clientMetaData
            );
          });
      });

    bus.on(ELEMENT_EVENTS_TO_IFRAME.TOKENIZATION_REQUEST, (data, callback) => {
      // todo: Do we need to reset the data!?
      this.tokenize()
        .then((data) => {
          callback(data);
        })
        .catch((error) => {
          callback(error);
        });
    });

    bus.on(ELEMENT_EVENTS_TO_IFRAME.DESTROY_FRAME, (data, callback) => {
      for (const iFrameFormElement in this.iFrameFormElements) {
        if (iFrameFormElement === data.name) {
          this.iFrameFormElements[iFrameFormElement].destroy();
          delete this.iFrameFormElements[iFrameFormElement];
        }
      }
      callback({});
    });
  }

  setClient(client) {
    this.client = client;
  }

  setClientMetadata(clientMetaData: any) {
    this.clientMetaData = clientMetaData;
    this.callbacks.forEach((func) => {
      func();
    });
    this.callbacks = [];
  }

  tokenize = () => {
    if (!this.client) throw new Error("client connection not established");
    const responseObject: any = {};
    for (const iFrameFormElement in this.iFrameFormElements) {
      const state = this.iFrameFormElements[iFrameFormElement].state;
      if (!state.isValid || !state.isComplete) {
        return Promise.reject({ error: "Provide complete and valid inputs" });
      }

      if (
        this.iFrameFormElements[iFrameFormElement].fieldType ===
        ELEMENTS.checkbox.name
      ) {
        if (Array.isArray(responseObject[state.name])) {
          responseObject[state.name].push(state.value);
        } else if (state.value !== "" && state.value !== undefined) {
          responseObject[state.name] = [state.value];
        }
      } else {
        responseObject[state.name] = this.iFrameFormElements[
          iFrameFormElement
        ].getUnformattedValue();
      }
    }

    return this.client.deliverPayload(responseObject);

    //     {Credit_score: "0608",…}
    // Credit_score: "0608"
    // Skyflow_vault_response: {responses: [{ID: "010100003d1d19f34f2b36ec84f5afd1",…}]}
    // responses: [{ID: "010100003d1d19f34f2b36ec84f5afd1",…}]
    // 0: {ID: "010100003d1d19f34f2b36ec84f5afd1",…}
    // ID: "010100003d1d19f34f2b36ec84f5afd1"
    // fields: [{ID: "0102000db5ae61e001c0bb83533f29b7", name: "social_security_number"},…]
    // 0: {ID: "0102000db5ae61e001c0bb83533f29b7", name: "social_security_number"}
    // 1: {ID: "0102000c4120875fabb0ba6759af9f06", name: "phone_number"}
    // ID: "0102000c4120875fabb0ba6759af9f06"
    // name: "phone_number"
    // 2: {ID: "0102000b5489f81194b50e45133acb74", name: "permanent_address"}
    // 3: {ID: "01020009c734031e035ae650ee47383c", name: "middle_name"}
    // 4: {ID: "01020008c4aaef70c4b6cfcc3998e819", name: "level_of_study"}
    // 5: {ID: "01020007060481d95b48d85fd107f56a", name: "last_name"}
    // 6: {ID: "0102000602a7fe6080884a315fab94ba", name: "first_name"}
    // 7: {ID: "01020005e6ec681ea502411df63b567c", name: "email_address"}
    // ID: "01020005e6ec681ea502411df63b567c"
    // name: "email_address"
    // 8: {ID: "010200046ea92a4bdf48554de2148fec", name: "date_of_birth"}
    // 9: {ID: "010200033a3ee8e25ba98fc3906df564", name: "address_zip_code"}
    // 10: {ID: "010200023de8f3804d797648a574e60e", name: "address_street"}
    // 11: {ID: "0102000196ea24eb58e0d39f399b77ba", name: "address_state"}
    // 12: {ID: "01020000a6b9cd0ac847b03736302292", name: "address_city"}
  };

  static initializeFrame = (
    root: Window,
    frameGlobalName: string,
    iFrameFormElements: Record<string, IFrameFormElement>,
    metaData
  ) => {
    let frameInstance: any = undefined;
    for (let i = 0; i < root.frames.length; i++) {
      const frame: any = root.frames[i];

      try {
        if (
          frame.location.href === location.href &&
          frame.name === frameGlobalName
        ) {
          frameInstance = frame;
          break;
        }
      } catch (e) {
        /* ignored */
        console.log("error");
      }
    }

    if (!frameInstance) {
      throw new Error("frame not found: " + frameGlobalName);
    } else {
      // const frameValues = frameGlobalName.split(":");
      // frameValues.splice(2);
      // const key = frameValues.join(":");
      iFrameFormElements[frameGlobalName] =
        iFrameFormElements[frameGlobalName] ||
        new IFrameFormElement(frameGlobalName, frameGlobalName, {
          ...metaData,
        });

      frameInstance.Skyflow.init(iFrameFormElements[frameGlobalName]);
    }
  };
}

export class IFrameFormElement extends EventEmitter {
  // All external Events and state events will be handled here
  state = {
    value: <undefined | string>undefined,
    isFocused: false,
    isValid: false, // todo: is fix needed?
    isEmpty: true,
    isComplete: false,
    // isPotentiallyValid: false, todo: check whether this is useful or not
    name: "",
  };
  readonly fieldType: string;
  private sensitive: boolean;
  fieldName: string;
  iFrameName: string;
  // iFrameSignificantName: string;
  metaData;
  private regex?: RegExp;
  private replacePattern?: [RegExp, string];
  private mask?: any;
  constructor(frameSignificantName: string, frameGlobalName: string, metaData) {
    // todo: create each class for each fieldType and assign to a local variable variable
    super();
    const frameValues = frameSignificantName.split(":");
    const fieldType = frameValues[0];
    const fieldName = isNaN(parseInt(frameValues[1])) // set frame name as frame type of the string besides : is number
      ? frameValues[1]
      : frameValues[0];

    // this.iFrameSignificantName = frameSignificantName;
    this.iFrameName = frameGlobalName;
    this.fieldType = fieldType;
    this.fieldName = fieldName;

    this.sensitive = ELEMENTS[this.fieldType].sensitive;

    this.state.name = fieldName;

    this.metaData = metaData;

    // todo: need to create single radio button and checkbox form element

    this.collectBusEvents();
  }

  onFocusChange = (focus: boolean) => {
    bus.emit(ELEMENT_EVENTS_TO_IFRAME.INPUT_EVENT, {
      name: this.iFrameName,
      event: focus
        ? ELEMENT_EVENTS_TO_CLIENT.FOCUS
        : ELEMENT_EVENTS_TO_CLIENT.BLUR,
    });
    this.changeFocus(focus);
  };

  changeFocus = (focus: boolean) => {
    this.state.isFocused = focus;

    this.sendChangeStatus();

    if (this.mask) {
      this.setValue(this.state.value, true);
    }
  };

  setReplacePattern(pattern: string[]) {
    if (!pattern) return;
    this.replacePattern = [regExFromString(pattern[0]), pattern[1] || ""];
  }

  setMask(mask: string[]) {
    // todo apply mask only for req types
    if (!mask) {
      return;
    }
    const newMask: any[] = [];
    newMask[0] = mask[0];
    newMask[1] = null; //todo: replacer options
    newMask[2] = mask[1];
    if (newMask[2]) {
      Object.keys(newMask[2]).forEach((key) => {
        newMask[2][key] = new RegExp(newMask[2][key]);
      });
    } else {
      newMask[2]["9"] = /[0-9]/;
      newMask[2]["a"] = /[a-zA-Z]/;
      newMask[2]["*"] = /[a-zA-Z0-9]/;
    }

    this.mask = newMask;
  }

  setValidation(validations: string[] | undefined) {
    if (validations) {
      if (validations.includes("default"))
        this.regex = ELEMENTS[this.fieldType].regex;
      else {
        validations.forEach((value) => {
          if (value !== "default" && value !== "required") {
            this.regex = regExFromString(value);
          }
        });
      }
    }
  }

  setSensitive(sensitive: boolean = this.sensitive) {
    if (this.sensitive === false && sensitive === true) {
      this.sensitive = sensitive;
    } else if (this.sensitive === true && sensitive === false) {
      throw Error("Sensitivity is backward compatible");
    }
  }

  // todo: send error message of the field
  setValue = (value: string = "", valid: boolean = true) => {
    // todo: validate by the type of class
    // if (!value) value = "";

    // todo: mask only for req fields
    if (this.mask) {
      value = mask(value, this.state.value, this.mask, this.state.isFocused);

      valid = valid && this.mask[0].length === value.length;
    } else if (this.replacePattern) {
      value = value.replace(this.replacePattern[0], this.replacePattern[1]);
    }

    if (this.fieldType === ELEMENTS.checkbox.name) {
      // toggle for checkbox
      if (this.state.value === value) {
        this.state.value = "";
      } else {
        this.state.value = value;
      }
    } else {
      this.state.value = value;
    }

    if (this.fieldType === "dob" && typeof value === "string" && value) {
      this.state.value = new Date(value)
        .toISOString()
        .slice(0, 10)
        .split("-")
        .reverse()
        .join("/");
    }

    if (this.getUnformattedValue() && this.state.isEmpty) {
      this.state.isEmpty = false;
    } else if (!this.getUnformattedValue() && !this.state.isEmpty) {
      this.state.isEmpty = true;
    }

    if (valid && this.validator(this.state.value)) {
      this.state.isValid = true;
      this.state.isComplete = true;
    } else {
      this.state.isValid = false;
      this.state.isComplete = false;
    }

    this.sendChangeStatus(true);
  };

  getValue = () => {
    if (
      this.fieldType === "dob" &&
      this.state.value &&
      typeof this.state.value === "string"
    ) {
      return this.state.value.split("/").reverse().join("-");
    }
    return this.state.value;
  };

  getUnformattedValue = () => {
    // todo for redact
    if (!this.mask) return this.state.value;
    return unMask(this.state.value, this.mask);
  };

  getStatus = () => {
    return {
      isFocused: this.state.isFocused,
      isValid: this.state.isValid,
      isEmpty: this.state.isEmpty,
      isComplete: this.state.isComplete,
      ...(!this.sensitive && { value: this.state.value }),
    };
  };

  validator(value: string) {
    if (this.regex) {
      return this.regex.test(value);
    } else {
      return true;
    }
  }

  // on client force focus
  collectBusEvents = () => {
    bus
      .target(this.metaData.clientDomain)
      .on(ELEMENT_EVENTS_TO_IFRAME.INPUT_EVENT, (data, callback) => {
        if (bus.origin === this.metaData.clientDomain)
          if (data.name === this.iFrameName) {
            if (data.event === ELEMENT_EVENTS_TO_CLIENT.FOCUS) {
              this.changeFocus(true);
              this._emit(ELEMENT_EVENTS_TO_CLIENT.FOCUS);
            } else if (data.event === ELEMENT_EVENTS_TO_CLIENT.BLUR) {
              this.changeFocus(false);
              this._emit(ELEMENT_EVENTS_TO_CLIENT.BLUR);
            }
            // todo: listen to remaining events
          } else {
            // empty
          }
      });

    bus
      .target(this.metaData.clientDomain)
      .on(ELEMENT_EVENTS_TO_IFRAME.SET_VALUE, (data) => {
        if (
          location.origin === this.metaData.clientDomain &&
          data.name === this.iFrameName
        ) {
          if (data.value !== undefined) {
            // for setting value
            this.setValue(<string | undefined>data.value);
          } else if (data.options !== undefined) {
            // for updating options
            this._emit(ELEMENT_EVENTS_TO_IFRAME.SET_VALUE, {
              options: data.options,
            });
          }
        }
      });

    // for radio buttons
    if (this.fieldType === ELEMENTS.radio.name) {
      bus
        .target(location.origin)
        .on(ELEMENT_EVENTS_TO_IFRAME.SET_VALUE, (data) => {
          if (
            data.value !== null &&
            data.value !== undefined &&
            data.value !== "" &&
            data.fieldName === this.fieldName &&
            data.fieldType === this.fieldType &&
            data.value !== this.state.value
          ) {
            this.setValue(<string | undefined>data.value);
          }
        });
    }
  };

  // todo: add setMethods to state object and emit this event in that methods
  sendChangeStatus = (inputEvent: boolean = false) => {
    // todo: need to emit it on any state change
    bus.emit(ELEMENT_EVENTS_TO_IFRAME.INPUT_EVENT, {
      name: this.iFrameName,
      event: ELEMENT_EVENTS_TO_CLIENT.CHANGE,
      value: this.getStatus(),
    });

    // todo: check the security issues
    this._emit(ELEMENT_EVENTS_TO_CLIENT.CHANGE, {
      ...this.getStatus(),
      value: this.state.value,
    });

    // send change states for radio button(sync)
    if (inputEvent && this.fieldType === ELEMENTS.radio.name) {
      bus.target(location.origin).emit(ELEMENT_EVENTS_TO_IFRAME.SET_VALUE, {
        fieldName: this.fieldName,
        fieldType: this.fieldType,
        value: this.state.value,
      });
    }
  };

  resetData() {
    this.state = {
      value: "",
      isFocused: false,
      isValid: false,
      isEmpty: true,
      isComplete: false,
      name: "",
    };
  }
  destroy() {
    this.resetData();
    this.resetEvents();
  }
}
