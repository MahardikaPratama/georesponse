/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines ValidationError, the field-level validation error

	handlers construct for malformed or incomplete request bodies
	before a request ever reaches a use case (e.g. unparseable JSON, a
	missing required field). Domain-level validation failures (invalid
	resource type, out-of-range coordinates, ...) are reported by the
	domain's own sentinel errors instead and mapped separately in
	error.go — ValidationError is specifically for request-shape
	problems the domain layer never sees.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package httpresponse

// FieldError identifies one invalid field in a request body, so that a
// VALIDATION_ERROR response lets the caller identify which field(s) were
// invalid.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationError reports that a request body failed structural or
// field-level validation before reaching a use case. WriteError maps it
// to 400 VALIDATION_ERROR, with Fields as the response's error.details.
type ValidationError struct {
	Fields []FieldError
}

// NewValidationError constructs a ValidationError from one or more field
// problems.
func NewValidationError(fields ...FieldError) *ValidationError {
	return &ValidationError{Fields: fields}
}

// Error implements the error interface.
func (e *ValidationError) Error() string {
	return "request validation failed"
}

// Details returns the field-level problems, for use as the response's
// error.details.
func (e *ValidationError) Details() []FieldError {
	return e.Fields
}
