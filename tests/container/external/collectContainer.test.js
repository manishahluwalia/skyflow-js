import {
  COLLECT_FRAME_CONTROLLER,
  ELEMENT_EVENTS_TO_IFRAME,
} from '../../../src/container/constants';
import CollectContainer from '../../../src/container/external/CollectContainer';
import * as iframerUtils from '../../../src/iframe-libs/iframer';
import SkyflowError from '../../../src/libs/SkyflowError';
import { LogLevel,Env, ValidationRuleType } from '../../../src/utils/common';
import logs from '../../../src/utils/logs';

const bus = require('framebus');

iframerUtils.getIframeSrc = jest.fn(() => ('https://google.com'));

const getBearerToken = jest.fn().mockImplementation(() => Promise.resolve());

const mockUuid = '1234'; 
jest.mock('../../../src/libs/uuid',()=>({
  __esModule: true,
  default:jest.fn(()=>(mockUuid)),
}));

const metaData = {
  uuid: '123',
  config: {
    vaultId: 'vault123',
    vaultUrl: 'sb.vault.dev',
    getBearerToken,
  },
  metaData: {
    clientDomain: 'http://abc.com',
  },
  clientJSON: {
    config: {
      getBearerToken,
    },
  },
};

const cvvElement = {
  table: 'pii_fields',
  column: 'primary_card.cvv',
  styles: {
    base: {
      color: '#1d1d1d',
    },
  },
  placeholder: 'cvv',
  label: 'cvv',
  type: 'CVV',
};

const on = jest.fn();

const collectResponse = {
  records: [
    {
      table: 'table',
      fields: {
        first_name: 'token1',
        primary_card: {
          card_number: 'token2',
          cvv: 'token3',
        },
      },
    },
  ],
};

describe('Collect container', () => {

  let emitSpy;
  let targetSpy;
  beforeEach(() => {
    emitSpy = jest.spyOn(bus, 'emit');
    targetSpy = jest.spyOn(bus, 'target');
    targetSpy.mockReturnValue({
      on,
      off: jest.fn()
    });
  });

  it('contructor', async () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    await new Promise((r) => setTimeout(r, 2000));

    const frameReadyCb = on.mock.calls[0][1];
    const cb2 = jest.fn();
    frameReadyCb({
      name: COLLECT_FRAME_CONTROLLER+mockUuid
    }, cb2)
    expect(cb2).toHaveBeenCalled()
    expect(document.querySelector('iframe')).toBeTruthy();
  });

  it('Invalid element type', () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    try {
      const cvv = container.create({ ...cvvElement, type: 'abc' });
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('Invalid table', () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    try {
      const cvv = container.create({
        ...cvvElement,
        table: undefined,
      });
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('Invalid column', () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    try {
      const cvv = container.create({
        ...cvvElement,
        column: undefined,
      });
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('Invalid validation params, missing element', () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    try {
      const cvv = container.create({
        ...cvvElement,
        column: undefined,
        validations: [{
          type: ValidationRuleType.ELEMENT_MATCH_RULE,
          params: {}
        }]
      });
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('Invalid validation params, invalid collect element', () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    try {
      const cvv = container.create({
        ...cvvElement,
        column: undefined,
        validations: [{
          type: ValidationRuleType.ELEMENT_MATCH_RULE,
          params: {
            element: ''
          }
        }]
      });
    } catch (err) {
      expect(err).toBeDefined();
    }
  });


  it('create valid Element', () => {
    const container = new CollectContainer({}, metaData, { logLevel: LogLevel.ERROR,env:Env.PROD });
    let cvv;
    try {
      cvv = container.create(cvvElement);
    } catch (err) {}

    expect(cvv.elementType).toBe('CVV');

    expect(container.collect).rejects.toEqual(new Error(logs.errorLogs.ELEMENTS_NOT_MOUNTED));
  });

  it("container collect", () => {
    let container = new CollectContainer({}, metaData,  { logLevel: LogLevel.ERROR,env:Env.PROD });
    container.collect();
    const collectCb = emitSpy.mock.calls[0][2];
    collectCb(collectResponse)
    collectCb({error: 'Error occured'})
  });
});
