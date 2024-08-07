import type { PeerCertificate } from 'node:tls';

export type CertAuthOptions = {
  method: 'cert';
  validateCredentials: (credentials: {
    user: string;
    certificate: PeerCertificate;
  }) => boolean | Promise<boolean>;
};
