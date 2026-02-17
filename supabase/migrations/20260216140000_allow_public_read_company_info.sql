-- Allow authenticated users (including coaches) to read specific company info from app_configs
CREATE POLICY "Public read specific app_configs" ON app_configs
  FOR SELECT
  TO authenticated
  USING (
    key IN (
      'company_name', 
      'company_address', 
      'invoice_registration_number', 
      'contact_email', 
      'company_payment_bank_name',
      'company_info'
    )
  );
