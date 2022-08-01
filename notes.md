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

## Security group connections
- Connections class allows network connections to/from SGs and between security SGs.
- Automatically adds rules in both security groups when establishing connectivity between SGs
- can manage many objects via addSecurityGroup() method


# What is a security group
Virtual firewall that blocks all traffic except the ports, protocols, and sources you specify.
- Protocols: UDP, TCP, etc.
- Sources: IP range, another subnet, public internet, or other security groups
Rules are defined for inbound and outbound.
- Rules are stateful

## Managing secrets

Create a secret for the db credentials (username and password) 
- retrieve the secret from secrets manager
  - pass it in to credentials property of db
  - pass it in as environment variable to containers

```js
 // 👇 get access to the secret object
    const dbPasswordSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'db-pwd-id',
      'databasePassword',
    );

    const myFunction = new NodejsFunction(this, 'my-function', {
      // 👇 set secret value as ENV variable
      environment: {
        SECRET_NAME: dbPasswordSecret.secretName,
        SECRET_VALUE: dbPasswordSecret.secretValue.toString(),
      },
```

https://bobbyhadz.com/blog/get-secrets-manager-values-aws-cdk
https://blog.phillipninan.com/provision-an-rds-instance-using-the-aws-cdk-and-secrets