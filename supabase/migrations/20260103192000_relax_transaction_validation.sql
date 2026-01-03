-- Relax transaction validation to allow expenses without categories (e.g. adjustments)
-- Overwrites the function from 003_functions_triggers.sql

CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Removed strict check for expense category/subcategory to allow Balance Adjustments
    -- and flexibility. Application layer can enforce this if needed.
    
    -- Transfer must have transfer_account_id
    IF NEW.type = 'transfer' AND NEW.transfer_account_id IS NULL THEN
        RAISE EXCEPTION 'Transfer transactions must specify a destination account';
    END IF;
    
    -- Transfer cannot transfer to same account
    IF NEW.type = 'transfer' AND NEW.account_id = NEW.transfer_account_id THEN
        RAISE EXCEPTION 'Cannot transfer to the same account';
    END IF;
    
    -- Set attributed_to_user_id if not set
    IF NEW.attributed_to_user_id IS NULL THEN
        NEW.attributed_to_user_id := NEW.created_by;
    END IF;
    
    RETURN NEW;
END;
$$;
