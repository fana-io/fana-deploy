# Fana docker-compose

Navigate to the `Fana-Docker` directory.

Run the following command: `docker-compose up`

# Fana CDK JavaScript

## Prerequisite

To use the CDK App, you need the following:
- AWS CLI installed and configured with your credentials and AWS region.
- Install AWS CDK: `npm install -g aws-cdk`
- Bootstrap (create dedicated Amazon S3 buckets and other containers to be available to AWS CloudFormation during deployment) using:
  `cdk boostrap aws://ACCOUNT-NUMBER/REGION`

## Deploy Fana
Navigate to the `Fana-CDK` directory.

Run `cdk list` to list the stacks in the app.

There are two different stacks defined in our CDK: 

1. `fana-shared-resources` which includes:
  - AWS VPC;
  - an instance of Relational Database Service (RDS); and
  - an Elasticache Redis cluster.

2. `FanaPlatformStack` includes:
  - the Fana Manager and Bearer containers;
  - the load balancer; and
  - the security groups. 

The `fana-shared-resources` are referenced in the `FanaPlatformStack`.

To deploy both stacks, run `cdk deploy --all`.

Use the load balancer DNS output to access the UI dashboard and to specify Flag Bearer endpoint for the SDKs.