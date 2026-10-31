import unittest
import numpy as np
from engine_v3 import cutoff,measurements,split,normal
class EngineV3Tests(unittest.TestCase):
 def test_threshold_limits_false_positive_on_validation(self):
  y=[0]*100+[1]*100;s=np.array([i/200 for i in range(100)]+[.6+i/400 for i in range(100)])
  t=cutoff(y,s,.05);m=measurements(y,s,t)
  self.assertLessEqual(m['human_false_positive_rate'],.05)
 def test_groups_never_cross_partitions(self):
  rows=[]
  for i in range(250):
   for label in ('ai','human'):rows.append(('Sample '+str(i),label,'topic-'+str(i)))
  partitions=split(rows,'en')
  ids=[{r[2] for r in v} for v in partitions.values()]
  self.assertFalse(ids[0]&ids[1]);self.assertFalse(ids[0]&ids[2]);self.assertFalse(ids[1]&ids[2])
 def test_unicode_normalization(self):self.assertEqual(normal('  يك  TEST   '),'یک test')
if __name__=='__main__':unittest.main()
