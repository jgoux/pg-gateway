import type { Socket } from 'node:net';
import type { Writer } from 'pg-protocol/dist/buffer-writer.js';
import {
  type BackendError,
  createBackendErrorMessage,
} from '../../backend-error.js';
import { BackendMessageCode } from '../../message-codes.js';

const SaslMessageCode = {
  AuthenticationSASL: 10,
  AuthenticationSASLContinue: 11,
  AuthenticationSASLFinal: 12,
} as const;

export class SaslMechanism {
  socket: Socket;
  writer: Writer;
  constructor(params: {
    socket: Socket;
    writer: Writer;
  }) {
    this.socket = params.socket;
    this.writer = params.writer;
  }

  sendAuthenticationSASL() {
    const mechanisms = ['SCRAM-SHA-256'];
    this.writer.addInt32(SaslMessageCode.AuthenticationSASL);
    for (const mechanism of mechanisms) {
      this.writer.addCString(mechanism);
    }
    this.writer.addCString('');
    const response = this.writer.flush(
      BackendMessageCode.AuthenticationResponse,
    );
    this.socket.write(response);
  }

  sendAuthenticationSASLContinue(message: string) {
    this.writer.addInt32(SaslMessageCode.AuthenticationSASLContinue);
    this.writer.addString(message);
    const response = this.writer.flush(
      BackendMessageCode.AuthenticationResponse,
    );
    this.socket.write(response);
  }

  sendAuthenticationSASLFinal(message: string) {
    this.writer.addInt32(SaslMessageCode.AuthenticationSASLFinal);
    this.writer.addString(message);
    const response = this.writer.flush(
      BackendMessageCode.AuthenticationResponse,
    );
    this.socket.write(response);
  }

  /**
   * Sends an error message to the frontend.
   *
   * @see https://www.postgresql.org/docs/current/protocol-message-formats.html#PROTOCOL-MESSAGE-FORMATS-ERRORRESPONSE
   *
   * For error fields, see https://www.postgresql.org/docs/current/protocol-error-fields.html#PROTOCOL-ERROR-FIELDS
   */
  sendError(error: BackendError) {
    const errorMessage = createBackendErrorMessage(error);
    this.socket.write(errorMessage);
  }
}
