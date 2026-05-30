# **Meeting Minutes \- Akatsuki 5/29**

**Team Number:** Group 09  
 **Team Name:** Akatsuki  
 **Meeting Type:** Standup Meeting  
 **Date:** 5/28/26  
 **Start Time:** 2:00 PM  
 **End Time:** 2:50 PM  
 **Location:** Geisel, Zoom 
 **Recorded By:** Jason Nguyen

---

## **1\. Attendance**

### **Members Present**

* Hemendra Ande  
* James Villanueva  
* Jason Nguyen  
* Aditya Jadhav 
* Daniel Wu  
* Woosik Kim
* Waleed Alghaithi

### **Members Absent**

* Fahad Majidi  
* Josh Victoria  
* Alexis Navarrete  
* Hieu Le  

---

## **2\. Meeting Purpose**

Discuss and begin implementing new backend APIs.

---

## **3\. Agenda**

* Authorization
* Database
* Other frontend changes

---

## **4\. Old Business**

* None

---

## **5\. New Business**

### **Topic 1: Authorization**

**Summary:**

* Weighing Clerk vs. our own authorization implementation
* Leaning toward Clerk due to it likely being easier
* Clerk handles cookies/tokens/session IDs for us
* Resolves the need for password storage
* Will need to connect Clerk IDs to database for curated access
* Add potential logout feature to leave Watchtower page
* Will likely stick with free tier
* Need to update ADR

### **Topic 2: Database**

**Summary:**

* Need to set up PostgreSQL
* Need to rewrite existing SQLite implementation to work with PostgreSQL
* Look into installing Windows application
* Need to update ADR

### **Topic 3: Other Frontend Changes**

**Summary:**

* add logout button to settings
* resolve merge conflicts between different landing page branches
* resolve merge conflicts between different dashboard pages

## **6\. Decisions Made**

* N/A

---

## **7\. Items Not Discussed / Deferred**

* N/A

---

## **8\. Action Items**

| Task | Assigned To | Due Date | Notes |
| ----- | ----- | ----- | ----- |
| Authorization | Aditya and Jason | 6/7/26 | N/A |
| PostgreSQL | Aditya and Jason | 6/7/26 | N/A |
| Beacon and Navigation | Daniel and Woosik | 6/7/26 | N/A |
| Misc. Frontend Issues | Frontend | 6/7/26 | N/A |

---

## **9\. Next Meeting**

* Tuesday 6/2/26

---

## **10\. Meeting Adjournment**

Meeting concluded at 2:50 PM