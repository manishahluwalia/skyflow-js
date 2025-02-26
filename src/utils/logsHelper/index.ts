import { LogLevel, MessageType } from '../common';

export const LogLevelOptions = {
  DEBUG: {
    showDebugLogs: true, showInfoLogs: true, showWarnLogs: true, showErrorLogs: true,
  },
  INFO: {
    showDebugLogs: false, showInfoLogs: true, showWarnLogs: true, showErrorLogs: true,
  },
  WARN: {
    showDebugLogs: false, showInfoLogs: false, showWarnLogs: true, showErrorLogs: true,
  },
  ERROR: {
    showDebugLogs: false, showInfoLogs: false, showWarnLogs: false, showErrorLogs: true,
  },
};

export const EnvOptions = {
  PROD: {
    doesReturnValue: false,
  },
  DEV: {
    doesReturnValue: true,
  },
};

const SDK_OWNER = '[Skyflow]';

export const printLog = (message: string, messageType:MessageType, logLevel:LogLevel) => {
  if (logLevel && LogLevelOptions[logLevel]) {
    const {
      showDebugLogs, showInfoLogs, showWarnLogs, showErrorLogs,
    } = LogLevelOptions[logLevel];
    if (messageType === MessageType.LOG && showDebugLogs) {
      // eslint-disable-next-line no-console
      console.log(`${LogLevel.DEBUG}: ${SDK_OWNER} ${message}`);
    } else if (messageType === MessageType.LOG && showInfoLogs) {
      // eslint-disable-next-line no-console
      console.log(`${LogLevel.INFO}: ${SDK_OWNER} ${message}`);
    } else if (messageType === MessageType.WARN && showWarnLogs) {
      // eslint-disable-next-line no-console
      console.warn(`${LogLevel.WARN}: ${SDK_OWNER} ${message}`);
    } else if (messageType === MessageType.ERROR && showErrorLogs) {
      // eslint-disable-next-line no-console
      console.error(`${LogLevel.ERROR}: ${SDK_OWNER} ${message}`);
    }
  }
};

export const parameterizedString = (...args: any[]) => {
  const str = args[0];
  const params = args.filter((arg, index) => index !== 0);
  if (!str) return '';
  return str.replace(/%s[0-9]+/g, (matchedStr: any) => {
    const variableIndex = matchedStr.replace('%s', '') - 1;
    return params[variableIndex];
  });
};

export const getElementName = (name:string = '') => {
  let tempName = atob(name.split(':')[2]);
  if (tempName.indexOf(':') !== -1) {
    tempName = tempName.substring(0, tempName.indexOf(':'));
  }
  return tempName;
};
