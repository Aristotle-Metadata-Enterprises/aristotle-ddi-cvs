#!/bin/bash
sam package --template-file template.yaml --s3-bucket aristotle-mdr-ddi-transformer --output-template-file packaged.yaml
sam deploy --template-file packaged.yaml --stack-name ddi-transformer --capabilities CAPABILITY_IAM
