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


https://stackoverflow.com/questions/71206122/adding-rule-to-the-security-group-which-is-created-automatically

This turned out to be easier than I thought- you can just flip the connection so that rather than trying to modify the rds to accept a security group of the ecs, you use the allowTo to establish a connection to the rds instance.

    ecsSG.connections.allowTo(props.rds, ec2.Port.tcp(5432), 'RDS Instance');


# LB Service
 - Create a LB with a security group that can take traffic from the internet
  - Add a listener that listens on port 80 using HTTP protocol that forwards traffic to a target group
  - Create a target group
    - Target type: IP
    - Protocol: http on port 3000
  
  - Register Target to Target group
    - add to VPC
    - Specify IPs ??? IPv4 address
    - define ports for routing to this target


Target group auto created with ApplicationLoadBalancedFargateService
- automatically adds first container as a registered target


## Not tried
// Use this function to create all load balancer targets to be registered in this service, add them to target groups, and attach target groups to listeners accordingly.
      // params: array of EcsTargets


        fanaFargateService.service.registerLoadBalancerTargets(
      {
        containerName: 'fanaBearerContainer',
        containerPort: 3001,
        newTargetGroupId: 'ECS',
        listener: ecs.ListenerConfig.applicationListener(listener, {
          conditions: [
            elbv2.ListenerCondition.pathPatterns(['/connect*', `/stream*`]),
          ],
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP,
          priority: 12,
        }),
      },
    );

        fanaFargateService.listener.addTargetGroups('bearer-targetgroup', {
      targetGroups: [fbTargetGroup],
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/connect*', `/stream*`]),
      ],
      priority: 12,
    });