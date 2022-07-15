data aws_acm_certificate certificate {
  domain   = "releasethehoundsapp.com"
  statuses = ["ISSUED"]
}

data aws_route53_zone zone {
  name = "releasethehoundsapp.com"
}

resource aws_route53_record www_cloudfront {
  for_each = toset(["releasethehoundsapp.com", "www.releasethehoundsapp.com"])

  name    = each.value
  type    = "A"
  zone_id = data.aws_route53_zone.zone.id

  alias {
    evaluate_target_health = false
    name                   = aws_cloudfront_distribution.distribution.domain_name
    zone_id                = aws_cloudfront_distribution.distribution.hosted_zone_id
  }
}
