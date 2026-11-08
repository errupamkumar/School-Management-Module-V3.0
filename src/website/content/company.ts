/** The company behind Vidyalaya: shown as "Powered by" and as the website's contact details. */
export const COMPANY = {
  name: 'SRM ECO TECH',
  legalName: 'SRM ECO TECH PVT. LTD.',
  url: 'https://test.srmecotech.com/',
  logo: { src: '/srm-eco-tech.png', width: 812, height: 307 },
  address: ['A-21, Ground Floor', 'Pandav Nagar, Delhi', 'Pin – 110092'],
  phones: ['(+91) 98748 30490', '(+91) 95819 83786'],
  email: 'info@srmecotech.com',
} as const;

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '').replace(/^\(?\+?91\)?/, '+91')}`;
