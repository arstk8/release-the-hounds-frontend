terraform {
  backend "s3" {
    bucket = "wltdo-tf-state"
    region = "us-east-1"
    key    = "release-the-hounds-frontend/terraform.tfstate"
  }
}

provider "aws" {
  region = "us-east-1"
}

data aws_caller_identity current {}
