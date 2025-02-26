import bus from 'framebus';
import 'jquery-mask-plugin/dist/jquery.mask.min';
import { IFrameFormElement } from '../../../src/core/internal/iFrameForm';
import { FrameController, FrameElement } from '../../../src/core/internal/index';
import { Env, LogLevel } from '../../../src/utils/common';
import EventEmitter from '../../../src/event-emitter';
import { ELEMENT_EVENTS_TO_CLIENT, ELEMENT_EVENTS_TO_IFRAME } from '../../../src/core/constants';

jest.mock('../../../src/event-emitter');

const on = jest.fn();

const tableCol = btoa('table.col');
const collect_element = `element:CVV:${tableCol}`;

const context = {
  logLevel: LogLevel.ERROR,
  env: Env.PROD,
};

const inputStyles = {
  base: {
    border: '1px solid #eae8ee',
    padding: '10px 16px',
    borderRadius: '4px',
    color: '#1d1d1d',
    marginTop: '4px',
  },
  complete: {
    color: '#4caf50',
  },
  empty: {},
  focus: {},
  invalid: {
    color: '#f44336',
  },
};

const labelStyles = {
  base: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
};

const errorTextStyles = {
  base: {
    color: '#f44336',
  },
};

describe('test frame controller', () => {
  let emitSpy;
  // let onSpy;

  beforeEach(() => {
    emitSpy = jest.spyOn(bus, 'emit');
    // onSpy = jest.spyOn(bus, 'on');

    Object.defineProperty(document, 'referrer', { value: '' });
  });

  test('FrameController constructor', () => {
    const controller = FrameController.init('uuid', LogLevel.ERROR);
    const frameReadyCb = emitSpy.mock.calls[0][2];
    frameReadyCb({
      context,
      clientJSON: {
        config: {
          getBearerToken: jest.fn(),
        },
      },
    });
    expect(controller.controllerId).toBe('uuid');
  });

  test('FrameElement constructor', () => {
    const div = document.createElement('div');

    const formElement = new IFrameFormElement(collect_element, {}, context);
    const element = new FrameElement(formElement, {
      label: 'label',
      inputStyles,
      labelStyles,
      errorTextStyles,
    }, div);

    const inst = EventEmitter.mock.instances[0];
    const onSpy = inst.on.mock.calls;

    const focusCb = onSpy
      .filter((data) => data[0] === ELEMENT_EVENTS_TO_CLIENT.FOCUS);

    focusCb[0][1]();

    const blurCb = onSpy
      .filter((data) => data[0] === ELEMENT_EVENTS_TO_CLIENT.BLUR);

    const state = {
      value: '123',
      isFocused: false,
      isValid: true,
      isEmpty: true,
      isComplete: false,
    };
    blurCb[0][1](state);

    blurCb[0][1]({
      ...state,
      isValid: false,
      isEmpty: false,
    });

    const changeCb = onSpy
      .filter((data) => data[0] === ELEMENT_EVENTS_TO_CLIENT.CHANGE);

    changeCb[0][1](state);

    const setCb = onSpy
      .filter((data) => data[0] === ELEMENT_EVENTS_TO_IFRAME.SET_VALUE);
    setCb[0][1]({
      options: {
        label: 'label',
        inputStyles,
        labelStyles,
        errorTextStyles,
      },
    });

    element.setupInputField();
  });
});