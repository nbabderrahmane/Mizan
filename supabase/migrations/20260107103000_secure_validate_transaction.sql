-- ============================================================================
-- Security Patch: Secure validate_transaction Trigger - 20260107103000_secure_validate_transaction.sql
-- ============================================================================
-- Fixes "Function has a role mutable search_path" security warning.
-- Forces the function to execute with a fixed search_path (public).
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Expense must have category and subcategory
    IF NEW.type = 'expense' AND (NEW.category_id IS NULL OR NEW.subcategory_id IS NULL) THEN
        RAISE EXCEPTION 'Expense transactions must have a category and subcategory';
    END IF;
    
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
