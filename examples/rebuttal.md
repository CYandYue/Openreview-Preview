### Q1. What is the main contribution?

We thank the reviewer for the thoughtful feedback. **Our method models the contribution of each observation, allowing the system to focus on the evidence needed for the current task.**

The parameter $\\alpha$ controls the trade-off between coverage and efficiency. We clarify this design choice and add the ablation below.

### Q2. Additional experiments

We compare the complete model against two controlled variants under the same evaluation protocol.

| Setting | Accuracy ↑ | Time ↓ |
| --- | ---: | ---: |
| Baseline | 82.4 | 1.00× |
| Without weighting | 85.1 | 0.78× |
| **Full model** | **88.6** | **0.62×** |

> These are illustrative values for a fictional rebuttal, included only to demonstrate formatting.

### Q3. Objective and notation

Our objective combines prediction and regularization:

$$
\\mathcal{L}(\\theta) = \\frac{1}{N} \\sum_{i=1}^{N} \\ell_i(\\theta) + \\lambda \\lVert\\theta\\rVert_2^2.
$$

For completeness, the normalized weights are

$$
\\begin{aligned}
w_i &= \\frac{\\exp(s_i)}{\\sum_j \\exp(s_j)}, \\\\
\\sum_i w_i &= 1.
\\end{aligned}
$$

We will update the notation and include these clarifications in the revised manuscript.
