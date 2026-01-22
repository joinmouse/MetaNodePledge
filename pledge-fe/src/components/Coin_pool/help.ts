import BigNumber from 'bignumber.js';

export const dealNumber_18 = (num) => {
  if (num) {
    const x = new BigNumber(num);
    const y = new BigNumber(1e18);
    return x.dividedBy(y).toFixed();
  }
};

export const dealNumber_7 = (num) => {
  if (num) {
    return Math.floor(num * 10**7) / 10**7
  }
};

export const dealNumber_8 = (num) => {
  if (num) {
    const x = new BigNumber(num);
    const y = new BigNumber(1e6);
    return x.dividedBy(y).toString();
  }
};

export const dealNumber = (num) => {
  if (num) {
    const x = new BigNumber(num);
    const y = new BigNumber(1e18);
    return x.multipliedBy(y).toFixed();
  }
};
