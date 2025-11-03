-- Add PortOne Partner Settlement fields to academies table
-- This enables integration with PortOne Platform Settlement API (파트너 정산 자동화)

ALTER TABLE academies
ADD COLUMN portone_partner_id TEXT,
ADD COLUMN portone_contract_id TEXT,
ADD COLUMN bank_account JSONB,
ADD COLUMN business_registration_number TEXT,
ADD COLUMN tax_type TEXT CHECK (tax_type IN ('GENERAL', 'SIMPLIFIED', 'TAX_EXEMPT'));

-- Add comments for documentation
COMMENT ON COLUMN academies.portone_partner_id IS 'PortOne Platform API partner ID for settlement tracking';
COMMENT ON COLUMN academies.portone_contract_id IS 'Default contract ID for settlement calculations';
COMMENT ON COLUMN academies.bank_account IS 'Bank account information for settlements: {bank, accountNumber, accountHolder, currency}';
COMMENT ON COLUMN academies.business_registration_number IS 'Business registration number for tax purposes';
COMMENT ON COLUMN academies.tax_type IS 'Tax classification: GENERAL (일반과세), SIMPLIFIED (간이과세), TAX_EXEMPT (면세)';

-- Create index for faster partner lookups
CREATE INDEX idx_academies_portone_partner_id ON academies(portone_partner_id) WHERE portone_partner_id IS NOT NULL;
