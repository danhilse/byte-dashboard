// ============================================================================
// Field Registry — barrel export
// ============================================================================

// Layer 1: Data types
export {
  type SemanticDataType,
  type DataTypeCategory,
  type DataTypeMetadata,
  DATA_TYPE_METADATA,
  isDataTypeCompatible,
  getDataTypeMetadata,
  ALL_SEMANTIC_DATA_TYPES,
} from "./data-types"

// Layer 2: Entity fields
export {
  type EntityType,
  type EntityFieldDefinition,
  getFieldsForEntity,
  getFieldDefinition,
  getWatchableFields,
  getRuntimeWritableFields,
  getFieldsByDataType,
} from "./entity-fields"

// Layer 3a: Trigger variable pools
export { getVariablesForTrigger } from "./trigger-variable-pools"

// Layer 3b: Action I/O
export {
  type ActionIOSchema,
  type ActionOutputField,
  type ActionInputField,
  getActionIOSchema,
  isActionRuntimeSupported,
  getAllActionTypes,
  getRuntimeSupportedActionTypes,
  getActionOutputVariables,
} from "./action-io"

// Layer 4: Filters
export {
  type VariableOption,
  filterVariableOptions,
  filterEntityFieldsByDataType,
  getWatchableContactFieldOptions,
  getCustomVariableDataTypeOptions,
} from "./filters"
