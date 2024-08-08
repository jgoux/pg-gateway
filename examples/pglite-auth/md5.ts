import net from 'node:net';
import { PGlite } from '@electric-sql/pglite';
import {
  type BackendError,
  PostgresConnection,
  hashMd5Password,
} from 'pg-gateway';

const db = new PGlite();

const server = net.createServer((socket) => {
  const connection = new PostgresConnection(socket, {
    serverVersion: '16.3 (PGlite 0.2.0)',
    auth: {
      method: 'md5',
      async validateCredentials(credentials) {
        const { hash, salt } = credentials;
        const expectedHash = await hashMd5Password(
          'postgres',
          'postgres',
          salt,
        );
        return hash === expectedHash;
      },
    },

    async onStartup() {
      // Wait for PGlite to be ready before further processing
      await db.waitReady;
      return false;
    },
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return false;
      }

      // Forward raw message to PGlite
      try {
        const [result] = await db.execProtocol(data);
        if (result) {
          const [_, responseData] = result;
          connection.sendData(responseData);
        }
      } catch (err) {
        connection.sendError(err as BackendError);
        connection.sendReadyForQuery();
      }
      return true;
    },
  });

  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

server.listen(2345, () => {
  console.log('Server listening on port 5432');
});
