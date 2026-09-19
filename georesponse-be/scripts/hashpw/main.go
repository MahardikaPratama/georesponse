/*
Author       : Mahardika Pratama
Version      : 1.0.0
Created Date : 2026-09-19
Description  : One-off helper printing the bcrypt hash of its argument,

	used to generate the password_hash literal embedded in
	database/seeds/0002_sample_auth.sql. Not part of the running
	application; not wired into cmd/api.

Changelog:
  - 1.0.0 (2026-09-19): Initial creation.
*/
package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: hashpw <password>")
		os.Exit(1)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(os.Args[1]), bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(string(hash))
}
