const precalculated = [1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000];
class StateManager {
  constructor (options) {
    this.stateLength = options.stateLenth || 16;
    this.ttl = options.ttl || 60;
    this.allowedChars = options.allowedChars || '1234567890abcdef-';
    if (typeof this.stateLength !== 'number' || this.stateLength > 128) throw new Error();
    if (typeof this.ttl !== 'number' || options.ttl > 60 * 60) throw new Error();
    if (typeof this.allowedChars !== 'string') throw new Error();
    this.activeStates = new Set();
  }

  _genChar (options) {
    return options.allowedChars[Math.floor(Math.random() * options.allowedChars.length)];
  }

  _genState (options) {
    return new Array(options.stateLength).map(x => this._genChar(options)).join('');
  }

  handleSameState (options) {
    console.warn('2 same states were generated. Please beware.');
    // at one point, we assume there is no way you can have that much states in existence.
    if (this.activeStates.size >= (precalculated[this.allowedChars.length] || Infinity)) throw new Error('FATAL : All possible state combinations have been taken!');
    return this.createState(options);
  }

  createState (options) {
    options = { ...this.options, ...options };
    const state = this._genState(options);
    if (this.activeStates.has(state)) return this.handleSameState(options);
    this.activeStates.add(state);
    setTimeout(() => this.activeStates.delete(state), this.ttl * 1000, state);
    return state;
  }

  validateState (state) {
    return this.activeStates.delete(state);
  }
}

module.exports = StateManager;
