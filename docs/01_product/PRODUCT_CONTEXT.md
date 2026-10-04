# Product Context

## 1. Product Overview

GeoResponse is a geospatial resource management application for disaster
response.

It gives operators and response coordinators one place to view, manage,
search, filter, and monitor the resources involved in a response: vehicles,
facilities, equipment, and IoT devices. Each resource has an identity, a
type, attributes, an operational status, and a geographic location, and the
location is a core part of the resource rather than an optional attribute.

The precise definition of `Resource` is in `DOMAIN_MODEL.md`. What is in and
out of the product is defined in `SCOPE.md`.

---

## 2. Background and Problem

During a disaster response, people need accurate, structured information
about the resources they can draw on. Resources differ in type, status, and
location, and without a single organized source of that information users
struggle to:

- determine which resources are available
- understand the operational status of a resource
- identify where a resource is
- find resources by relevant characteristics
- get an overall view of current resource conditions

GeoResponse addresses this by combining resource management with
geospatial information in one system.

---

## 3. Product Goals

GeoResponse aims to let users:

1. Manage disaster response resource information in a structured way.
2. Monitor the operational status of resources.
3. Identify the geographic location of each resource.
4. Find resources based on relevant information.
5. View the distribution of resources on a map.
6. Access all of this through a single system.

---

## 4. Product Users

### 4.1 Operator

An operator manages resource information. Typical activities:

- adding resources
- updating resource information and status
- searching and filtering resources
- viewing resource locations and details

### 4.2 Response Coordinator

A response coordinator uses resource information to understand the
condition and distribution of available resources. Their main needs:

- viewing available resources
- understanding resource status
- identifying resource locations
- getting a geographic overview of resource distribution

---

## 5. Product Principles

- **Information-centric.** The system provides structured, consistent, and
  accessible resource information.
- **Geospatial by design.** Location is part of the core resource model and
  is used in the main interactions, not added on as an extra attribute.
- **Consistent information.** What users see accurately represents the data
  the system manages.
- **Simple and focused.** The product covers resource management and
  monitoring and does not grow into a comprehensive disaster management
  system.
- **Extensible.** The resource model supports new kinds of real-world
  objects without changing the core resource concept.

---

## 6. Product Boundaries

GeoResponse manages and monitors resource information. It is not a
prediction, early warning, navigation, dispatch, optimization, emergency
communication, or comprehensive disaster management system. The full
out-of-scope list is in `SCOPE.md` section 4.

---

## 7. Product Success Criteria

GeoResponse meets its primary objectives when users can:

1. View the resources managed by the system.
2. Understand the basic information and status of each resource.
3. Identify the geographic location of resources.
4. Find resources based on relevant criteria.
5. View resources on a map.
6. Manage resource information in a structured way.
