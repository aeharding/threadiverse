import { PiefedErrorResponse } from "./types";

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

export class ResponseError extends FediverseError {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `${status}`);
    this.status = status;
    this.name = "ResponseError";
  }
}
export class PiefedResponseError extends ResponseError {
  response: PiefedErrorResponse;

  constructor(status: number, payload: PiefedErrorResponse) {
    super(status, payload.message);
    this.response = payload;
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
