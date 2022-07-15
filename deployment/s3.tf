locals {
  dist_file_name = "dist.zip"
}

resource aws_s3_bucket dist_bucket {
  bucket = "releasethehounds-frontend-deployment"
}

resource aws_s3_bucket_website_configuration dist_website_configuration {
  bucket = aws_s3_bucket.dist_bucket.bucket

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource aws_s3_bucket_policy dist_bucket_policy {
  bucket = aws_s3_bucket.dist_bucket.id
  policy = data.aws_iam_policy_document.dist_bucket_policy_document.json
}

data aws_iam_policy_document dist_bucket_policy_document {
  statement {
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = [
      aws_s3_bucket.dist_bucket.arn,
      "${aws_s3_bucket.dist_bucket.arn}/*",
    ]
  }
}

resource aws_s3_object dist_objects {
  for_each = fileset("../build", "**")

  bucket      = aws_s3_bucket.dist_bucket.id
  key         = each.value
  source      = "../build/${each.value}"
  source_hash = filemd5("../build/${each.value}")
  acl         = "public-read"
}
