// Site-wide copy and facts. Anything marked VERIFY came from the concept site
// and must be confirmed with Leader before launch.
export const site = {
  name: 'LDR',
  tagline: 'Data racks and cabinets, distributed by Leader Systems.',
  tradePortal: 'https://partner.leadersystems.com.au',
  findReseller: '/where-to-buy',
  quoteEmail: 'sales@leadersystems.com.au', // VERIFY: correct enquiry inbox
  warehouses: [
    // VERIFY addresses/phones for every branch except Adelaide (taken from the concept site).
    { state: 'SA', city: 'Adelaide', address: '165–187 Franklin Street, Adelaide SA 5000', phone: '(08) 8112 6000' },
    { state: 'NSW', city: 'Sydney', address: null, phone: null },
    { state: 'VIC', city: 'Melbourne', address: null, phone: null },
    { state: 'QLD', city: 'Brisbane', address: null, phone: null },
    { state: 'WA', city: 'Perth', address: null, phone: null },
  ],
};

export const nav = [
  { href: '/products?kind=rack', label: 'Racks' },
  { href: '/products?kind=accessory', label: 'Accessories' },
  { href: '/carbon', label: 'Carbon' },
  { href: '/rack-builder', label: 'Rack Builder' },
  { href: '/support', label: 'Support' },
  { href: '/where-to-buy', label: 'Where to buy' },
];
