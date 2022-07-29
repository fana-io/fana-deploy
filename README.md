# Welcome to your CDK JavaScript project

This is a blank project for CDK development with JavaScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Useful commands

* `npm run test`         perform the jest unit tests
* `cdk deploy`           deploy this stack to your default AWS account/region
* `cdk diff`             compare deployed stack with current state
* `cdk synth`            emits the synthesized CloudFormation template

## Dev Notes:
- All I did so far to create this:
  - Pre-req:
    - Configure aws cli
    - Bootstrapping: allows containers to be available to AWS CloudFormation during deployment
      `cdk bootstrap aws://ACCOUNT-NUMBER/REGION`
  - Initialize cdk app: `cdk init app --language javascript`
  - copied Fjord's 'SharedResources.js' into our `mainResources.js` to get started :P 
    - was trying to figure out the VIP stuff today. They use NAT Gateway, but we don't. So maybe it's just 

- AWS CDK Toolkit (CLI) is the main tool used to interact with your AWS CDK app;
  - executes your code
  - produces and deploys the AWS CloudFormation templates

- standard AWS CDK development workflow: 
1. Create the app from a template provided by the AWS CDK `(done)`
2. Add code to the app to create resources within stacks `(to do now)`
3. Build the app (optional; the AWS CDK Toolkit will do it for you if you forget)
  - build step catches syntax and type errors
4. Synthesize one or more stacks in the app to create an AWS CloudFormation template
  - synthesis step catches logical errors in defining your AWS resources
5. Deploy one or more stacks to your AWS account
  - deployment may find permission issues
  


