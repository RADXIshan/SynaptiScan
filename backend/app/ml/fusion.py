def calculate_global_risk(modality_results):
    """
    Takes a list of ModalityResult objects and outputs a unified risk score.
    Uses inverse-variance weighting based on uncertainty.
    """
    if not modality_results:
        return 0.0
        
    total_weight = 0.0
    weighted_sum = 0.0
    
    for res in modality_results:
        if res.score is not None and res.uncertainty:
            weight = 1.0 / (res.uncertainty ** 2)
            weighted_sum += res.score * weight
            total_weight += weight
            
    if total_weight == 0:
        # Fallback to simple average
        scores = [r.score for r in modality_results if r.score is not None]
        return sum(scores) / len(scores) if scores else 0.0
        
    return min(max(weighted_sum / total_weight, 0.0), 1.0) # Clamp between 0 and 1
