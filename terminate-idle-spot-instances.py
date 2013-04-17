# Boto library provides a python SDK for AWS
# See http://aws.amazon.com/python/ for more information and a link to Boto
import boto
 
# Used by boto to represent times
import datetime
 
cloudwatch_connection = boto.connect_cloudwatch()
 
# Cloudwatch uses UTC
end = datetime.datetime.utcnow()
start = end - datetime.timedelta(hours=1)
# This is the dimensions to request from CloudWatch
# To get data for a specific instance replace instanceId for the instance you're looking for
# Detailed monitoring adds additional dimensions including AmiId, InstanceType
instances = open('spots').read().split()
dimensions = { 'InstanceId':instances[0] }
 
# The name of the metric to request.  This list can be retrieved by calling ListMetrics
metric_name = 'CPUUtilization'
 
# The namespace of the metric.  This can also be retrieved by calling ListMetrics
namespace = 'AWS/EC2'
action='arn:aws:automate:us-east-1:ec2:terminate'

# The statistic to request i.e. Average, Sum, Maximum, Minimum or SampleCount
statistics = ['Average']
 
unit = 'Percent'
for instance in instances:
  metric = cloudwatch_connection.list_metrics(dimensions={"InstanceId":instance},metric_name=metric_name)[0]
  result = metric.create_alarm(name=instance+' alarm',comparison="<=",threshold=50,period=300,evaluation_periods=5,statistic='Average',alarm_actions=action,unit="Percent")
  print result
'''
stats = {}
for instance in instances: 
  # This wil request data for for the period, for the time of start to end, and 
  datapoints = cloudwatch_connection.get_metric_statistics(60, start, end, metric_name,namespace , statistics,{'InstanceId':instance}, unit)[-1]['Average']
  stats[instance] = datapoints
sortedstats = sorted(stats.items(),key=lambda x: x[1],reverse=True)
print '\n'.join(map(str,sortedstats))
'''
