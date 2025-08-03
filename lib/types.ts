export interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  country?: string;
  whitelisted?: boolean;
  expiresAt?: Date;
}