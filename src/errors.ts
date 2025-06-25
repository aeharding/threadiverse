export class FediverseError extends Error {
  constructor(message: string, errorOptions?: ErrorOptions) {
    super(message, errorOptions);
    this.name = "FediverseError";
  }
}

export class InvalidPayloadError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayloadError";
  }
}

export class PiefedResponseError extends FediverseError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PiefedResponseError";
  }
}
export class UnexpectedResponseError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "UnexpectedResponseError";
  }
}

export class UnsupportedError extends FediverseError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedError";
  }
}

export class UnsupportedSoftwareError extends UnsupportedError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedSoftwareError";
  }
}
