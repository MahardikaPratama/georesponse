/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : Defines the Role and Permission domain types backing

	role-based authorization (FR-030 through FR-033).

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package authorization

// Permission is a single grantable capability, identified by a dotted
// code such as "resource.update".
type Permission struct {
	ID   string
	Code string
	Name string
}

// Role groups a named set of permission codes that can be assigned to
// users.
type Role struct {
	ID          string
	Name        string
	Permissions []string
}
