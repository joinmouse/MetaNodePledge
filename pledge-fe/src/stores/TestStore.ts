import { action, observable, makeAutoObservable } from 'mobx';

/**
 * TestStore
 */
class TestStore {
  count = 0;

  poolinfo;

  increment = () => {
    this.count += 1;
  };

  constructor() {
    makeAutoObservable(this, {
      count: observable,
      poolinfo: observable,
      increment: action,
    });
  }
}

export default TestStore;
