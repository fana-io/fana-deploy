## Postgres

- vpc must have at least 2 subnets in different AZs
- VPC must have a VPC security group that allows access to the DB instance.
- DB subnet group is collection of subnets (usually private) designated for DB instance
  - Subnet group lets us specify a VPC when you create DB instance 


https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html#USER_VPC.Hiding


Requirements
- db name
- role
- engine (postgres)
- Class (instance type and size)
- Port 5432
- Region & AZ
- VPC ID: vpc-091bfc8941cd05d2a
  - Subnet group: default-vpc-091bfc8941cd05d2a
    - Subnets
      subnet-01ac25c91638906c8
      subnet-0ef79a4e86dbc39f8
      subnet-0d753ea9f7203faac
      subnet-08a450b03bc1af84b
- VPC Security group
  - default (sg-06b37fc4ea323091f)


# example 
https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/rds/mysql/mysql.ts