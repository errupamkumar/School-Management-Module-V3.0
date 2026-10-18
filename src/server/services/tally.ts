/**
 * Tally Prime / Tally ERP 9 XML export (Gateway of Tally → Import → Vouchers /
 * Masters). Income becomes Receipt vouchers and expenses become Payment
 * vouchers, debiting/crediting the school's cash or bank ledger by payment mode.
 * Debits carry negative amounts, as Tally's import format expects.
 */
import type { SchoolSettings } from '../settings';

export interface TallyLine {
  id: string;
  date: Date;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  headName: string;
  description: string;
  mode: string | null;
  referenceNo: string | null;
  party: string | null;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');
const amt = (n: number) => n.toFixed(2);

export function ledgerFor(settings: SchoolSettings, headName: string): string {
  return settings.tally.ledgerMap[headName]?.trim() || headName;
}

export function moneyLedger(settings: SchoolSettings, mode: string | null): string {
  return mode === 'CASH' || !mode ? settings.tally.cashLedger : settings.tally.bankLedger;
}

function envelope(settings: SchoolSettings, report: 'Vouchers' | 'All Masters', body: string): string {
  const company = settings.tally.companyName.trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>${report}</REPORTNAME>
    <STATICVARIABLES>${company ? `<SVCURRENTCOMPANY>${esc(company)}</SVCURRENTCOMPANY>` : ''}</STATICVARIABLES>
   </REQUESTDESC>
   <REQUESTDATA>
${body}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>
`;
}

export function vouchersXml(settings: SchoolSettings, lines: TallyLine[]): string {
  const body = lines
    .map((l) => {
      const income = l.type === 'INCOME';
      const vtype = income ? 'Receipt' : 'Payment';
      const money = moneyLedger(settings, l.mode);
      const head = ledgerFor(settings, l.headName);
      // Receipt: Dr cash/bank, Cr income ledger. Payment: Dr expense ledger, Cr cash/bank.
      const debit = income ? money : head;
      const credit = income ? head : money;
      const narration = [l.description, l.party ? `${income ? 'From' : 'To'}: ${l.party}` : '', l.referenceNo ? `Ref: ${l.referenceNo}` : '', l.mode ? `Mode: ${l.mode}` : ''].filter(Boolean).join(' | ');
      return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER VCHTYPE="${vtype}" ACTION="Create" OBJVIEW="Accounting Voucher View">
      <DATE>${ymd(l.date)}</DATE>
      <VOUCHERTYPENAME>${vtype}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${esc(l.referenceNo ?? '')}</VOUCHERNUMBER>
      <REMOTEID>vidyalaya-${esc(l.id)}</REMOTEID>
      <NARRATION>${esc(narration)}</NARRATION>
      <PARTYLEDGERNAME>${esc(credit)}</PARTYLEDGERNAME>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${esc(debit)}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <AMOUNT>-${amt(l.amount)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${esc(credit)}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <AMOUNT>${amt(l.amount)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>
     </VOUCHER>
    </TALLYMESSAGE>`;
    })
    .join('\n');
  return envelope(settings, 'Vouchers', body);
}

/** Ledger masters for every ledger the vouchers use, under Tally's standard groups. */
export function mastersXml(settings: SchoolSettings, heads: Array<{ name: string; type: 'INCOME' | 'EXPENSE' }>): string {
  const ledgers = new Map<string, string>();
  ledgers.set(settings.tally.cashLedger, 'Cash-in-Hand');
  ledgers.set(settings.tally.bankLedger, 'Bank Accounts');
  for (const h of heads) {
    const name = ledgerFor(settings, h.name);
    if (!ledgers.has(name)) ledgers.set(name, h.type === 'INCOME' ? 'Indirect Incomes' : 'Indirect Expenses');
  }
  const body = [...ledgers]
    .map(
      ([name, parent]) => `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <LEDGER NAME="${esc(name)}" ACTION="Create">
      <NAME.LIST><NAME>${esc(name)}</NAME></NAME.LIST>
      <PARENT>${parent}</PARENT>
     </LEDGER>
    </TALLYMESSAGE>`
    )
    .join('\n');
  return envelope(settings, 'All Masters', body);
}
