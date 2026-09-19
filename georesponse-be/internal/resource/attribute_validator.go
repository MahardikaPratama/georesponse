/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the AttributeValidator strategy interface and the

	registry that dispatches to the validator for a resource's type
	(BR-004). Adding a new resource type means adding a new
	AttributeValidator implementation and registering it where the
	registry is constructed — this file and the registry type never
	change.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package resource

import (
	"errors"
	"fmt"
)

// Attribute validation errors. Per-type validators wrap these with
// errors.Is-compatible context via fmt.Errorf's %w verb.
var (
	// ErrMissingAttribute reports a required type-specific attribute key
	// that is absent from the attributes map.
	ErrMissingAttribute = errors.New("resource: required attribute is missing")
	// ErrInvalidAttribute reports a type-specific attribute whose value is
	// present but has the wrong type or fails a value rule.
	ErrInvalidAttribute = errors.New("resource: attribute has an invalid value")
)

// AttributeValidator validates the type-specific attributes of one
// resource Type (BR-004). Each resource Type has exactly one
// implementation, registered once with an AttributeValidatorRegistry.
type AttributeValidator interface {
	// ResourceType returns the Type this validator applies to.
	ResourceType() Type

	// Validate checks attributes against this Type's required keys and
	// value rules, returning an error (wrapping ErrMissingAttribute or
	// ErrInvalidAttribute) on the first violation found.
	Validate(attributes map[string]any) error
}

// AttributeValidatorRegistry dispatches attribute validation to the
// AttributeValidator registered for a given resource Type. Callers that
// need to validate a Resource's Attributes depend on this type rather than
// branching on Type themselves, so adding a new resource type never
// requires changing existing calling code (BR-004's Open/Closed
// requirement).
type AttributeValidatorRegistry struct {
	validators map[Type]AttributeValidator
}

// NewAttributeValidatorRegistry builds a registry from the given
// validators, keyed by each validator's own ResourceType.
func NewAttributeValidatorRegistry(validators ...AttributeValidator) *AttributeValidatorRegistry {
	r := &AttributeValidatorRegistry{validators: make(map[Type]AttributeValidator, len(validators))}
	for _, v := range validators {
		r.validators[v.ResourceType()] = v
	}
	return r
}

// Validate looks up the AttributeValidator registered for t and runs it
// against attributes. It returns an error if no validator is registered
// for t, or if the registered validator rejects attributes.
func (r *AttributeValidatorRegistry) Validate(t Type, attributes map[string]any) error {
	v, ok := r.validators[t]
	if !ok {
		return fmt.Errorf("resource: no attribute validator registered for resource type %q", t)
	}
	return v.Validate(attributes)
}

// isNonNegativeNumber reports whether v is a numeric value (as decoded
// from JSON or constructed directly in Go) that is greater than or equal
// to zero. Attribute maps commonly arrive as map[string]any, so numeric
// attributes may be any of Go's numeric kinds depending on their source.
func isNonNegativeNumber(v any) bool {
	switch n := v.(type) {
	case float64:
		return n >= 0
	case float32:
		return n >= 0
	case int:
		return n >= 0
	case int32:
		return n >= 0
	case int64:
		return n >= 0
	default:
		return false
	}
}
