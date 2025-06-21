export class FediverseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FediverseError";
  }
}

export class UnsupportedError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedError";
  }
}

export class UnexpectedResponseError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "UnexpectedResponseError";
  }
}

export class InvalidPayloadError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayloadError";
  }
}
