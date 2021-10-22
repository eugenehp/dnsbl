import dnsbl from './index'

const DBL = `zen.spamhaus.org`
const addresses = [`127.0.0.2`, `181.115.232.170`, `143.198.37.35`]

addresses.map( (address:string) => {
  dnsbl.lookupWithTxt(address, DBL)
  .then(res => {
    console.log(`response`, address, res)
  })
})