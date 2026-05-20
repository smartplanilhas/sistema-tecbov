-- Adiciona novos motivos de saída ao status do animal
ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_status_check;
ALTER TABLE animals ADD CONSTRAINT animals_status_check
  CHECK (status IN ('ativo', 'vendido', 'abatido', 'doado', 'extraviado', 'morto', 'transferido'));
