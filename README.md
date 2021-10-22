# @ehp/dnsbl

Query DNS-based blackhole lists

Support both IPv4 and IPv6 queries. Written in TypeScript. Thanks to @silverwind for the initial version in JavaScript.

Supported by [StartupMail](https://www.startupmail.com)

## Installation

```sh
npm i @ehp/dnsbl
```

## Usage

```ts
import dnsbl from '@ehp/dnsbl';

await dnsbl.lookup('127.0.0.2', 'zen.spamhaus.org');
// true

await dnsbl.lookup('127.0.0.2', 'zen.spamhaus.org', {includeTxt: true});
// {
//   listed: true,
//   txt: [['some txt'], ['another txt']]
// }

await dnsbl.batch(['1.2.3.4', '5.6.7.8'], ['dnsbl.somelist.net', 'dnsbl.someotherlist.net']);
// [
//   { blacklist: 'dnsbl.somelist.net', address: '1.2.3.4', listed: true },
//   { blacklist: 'dnsbl.somelist.net', address: '5.6.7.8', listed: false },
//   { blacklist: 'dnsbl.someotherlist.net', address: '1.2.3.4', listed: true },
//   { blacklist: 'dnsbl.someotherlist.net', address: '5.6.7.8', listed: false }
// ]
```
